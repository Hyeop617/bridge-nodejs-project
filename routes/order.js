const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const router = express.Router();

const db = mysql.createConnection({
    host: 'localhost',        // DB서버 IP주소
    port: 3306,               // DB서버 Port주소
    user: 'bmlee',            // DB접속 아이디
    password: 'bmlee654321',  // DB암호
    database: 'bridge'         //사용할 DB명
});

// ---------------------- 주문기능 -----------------------
const HandleOrder = (req, res) => {
    let body = req.body;
    let userpoint;
    let useramount = body.amount;
    let productDB = {};

    let    htmlstream = '';

    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/navbar.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/order.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs','utf8');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf8'});



    if (req.session.auth) {
        let sql_str_users = "SELECT uid, point from u21_users where uid ='" + req.session.uid + "';";
        db.query(sql_str_users, (err, userResults, field) => {
            if (err) {
                res.status(562).end("Not Found User");
            } else {
                console.log("User Found!!");
                userpoint = userResults[0].point;
            }
        });

        console.log("body itemid is " + body.itemid);
        let sql_str_product = "SELECT itemid, maker, pname, modelnum, rdate, price, dcrate, amount, pic, pdesc from u21_products where itemid ='" + body.itemid + "';";
        console.log(sql_str_product);
        db.query(sql_str_product, (err, productResults, field) => {
            if (err) {
                res.status(562).end("Not Found Product");
            } else {
                console.log("Product Found!!");
                productDB.price = productResults[0].price;
                productDB.dcrate = productResults[0].dcrate;
                productDB.amount = productResults[0].amount;

                let priceCalculated = productDB.price * ((100 - productDB.dcrate) / 100);

                if (priceCalculated * useramount >= userpoint) {
                    res.status(562).end("포인트가 부족합니다.");
                } else {
                    db.query("INSERT INTO u21_orders (user_id, products_id, price, amount) VALUES (?, ?, ?, ?)",
                        [req.session.uid, body.itemid, priceCalculated, useramount], (err, results, fields) => {
                            console.log("ORDERS :>");
                            if (err) {
                                console.log(err);
                                res.status(562).end("주문 오류");
                            } else {
                                db.query("UPDATE u21_users set point = ? where uid = ?",[userpoint - (priceCalculated * useramount), req.session.uid], (err, results, fields) => {
                                    console.log("USERS :>");
                                    if (err) {
                                        console.log(err);
                                        res.status(562).end("사용자 업데이트 오류");
                                    } else {
                                        db.query("UPDATE u21_products set amount = ? where itemid = ?", [productDB.amount - useramount, body.itemid], (err, results, fields) => {
                                            console.log("PRODUCTS :>");
                                            if (err) {
                                                console.log(err);
                                                res.status(562).end("상품 업데이트 오류");
                                            } else {
                                                console.log("구매 완료");
                                                res.end(ejs.render(htmlstream,  { 'title' : '쇼핑몰site',
                                                    'logurl': '/users/logout',
                                                    'loglabel': '로그아웃',
                                                    'regurl': '/users/profile',
                                                    'reglabel':req.session.who,
                                                    'product' : productResults[0],
                                                    'price' : priceCalculated,
                                                    'amount' : useramount}));
                                            }

                                        });
                                    }
                                });
                            }
                        });
                }

            }
        });
    }else{
        res.end(ejs.render(htmlstream, { 'title' : '쇼핑몰site',
            'logurl': '/users/auth',
            'loglabel': '로그인',
            'regurl': '/users/reg',
            'reglabel':'가입' }));
    }
};

const PrintOrder = (req, res) => {
    let    htmlstream = '';

    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/navbar.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/order.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs','utf8');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf8'});
}

router.post('/', HandleOrder);      // 상품리스트를 화면에 출력
// router.get('/', PrintOrder);      // 상품리스트를 화면에 출력

module.exports = router;
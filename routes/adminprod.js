const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const upload = multer({dest: __dirname + '/../public/images/uploads/products'});  // 업로드 디렉터리를 설정한다.
const router = express.Router();

const db = mysql.createConnection({
    host: 'localhost',        // DB서버 IP주소
    port: 3306,               // DB서버 Port주소
    user: 'bmlee',            // DB접속 아이디
    password: 'bmlee654321',  // DB암호
    database: 'bridge'         //사용할 DB명
});

//  -----------------------------------  상품리스트 기능 -----------------------------------------
// (관리자용) 등록된 상품리스트를 브라우져로 출력합니다.
const AdminPrintProd = (req, res) => {
    let htmlstream = '';
    let htmlstream2 = '';
    let sql_str;
    let page = req.params.page;
    console.log(page);

    if (req.session.auth && req.session.admin) {   // 관리자로 로그인된 경우에만 처리한다
        htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');    // 헤더부분
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminbar.ejs', 'utf8');  // 관리자메뉴
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminproduct.ejs', 'utf8'); // 상품 리스트
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');  // Footer
        sql_str = "SELECT SQL_CALC_FOUND_ROWS * from u21_products order by rdate desc, itemid desc LIMIT " + (10*(page-1)) +", 10;" // 상품조회SQL

        res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});

        db.query(sql_str, (error, results, fields) => {  // 상품조회 SQL실행
            if (error) {
                res.status(562).end("AdminPrintProd: DB query is failed");
            } else if (results.length <= 0) {  // 조회된 상품이 없다면, 오류메시지 출력
                htmlstream2 = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
                res.status(562).end(ejs.render(htmlstream2, {
                    'title': '알리미',
                    'warn_title': '상품조회 오류',
                    'warn_message': '조회된 상품이 없습니다.',
                    'return_url': '/'
                }));
            } else {  // 조회된 상품이 있다면, 상품리스트를 출력
                // console.log(fields);
                db.query("SELECT FOUND_ROWS() totalcount;",(err,resultRow,fields) =>{
                    let totalCount = resultRow[0].totalcount;
                    let totalPage = Math.ceil(totalCount / 10);
                    res.end(ejs.render(htmlstream, {
                        'title': '쇼핑몰site',
                        'logurl': '/users/logout',
                        'loglabel': '로그아웃',
                        'regurl': '/users/profile',
                        'reglabel': req.session.who,
                        'prodata': results,
                        'totalPage' : totalPage,
                        'page' : req.params.page
                    }));
                });
                  // 조회된 상품정보
            } // else
        }); // db.query()
    } else {  // (관리자로 로그인하지 않고) 본 페이지를 참조하면 오류를 출력
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품등록 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }

};

//  -----------------------------------  상품등록기능 -----------------------------------------
// 상품등록 입력양식을 브라우져로 출력합니다.
const PrintAddProductForm = (req, res) => {
    let htmlstream = '';


    if (req.session.auth && req.session.admin) { // 관리자로 로그인된 경우에만 처리한다
        htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');    // 헤더부분
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminbar.ejs', 'utf8');  // 관리자메뉴
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/product_form.ejs', 'utf8'); // 상품 등록
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');  // Footer

        res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
        res.end(ejs.render(htmlstream, {
            'title': '쇼핑몰site',
            'logurl': '/users/logout',
            'loglabel': '로그아웃',
            'regurl': '/users/profile',
            'reglabel': req.session.who,
        }));
    } else {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품등록 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }

};

// 상품등록 양식에서 입력된 상품정보를 신규로 등록(DB에 저장)합니다.
const HanldleAddProduct = (req, res) => {  // 상품등록
    let body = req.body;
    let htmlstream = '';
    let datestr, y, m, d, regdate;
    let prodimage = '/images/uploads/products/'; // 상품이미지 저장디렉터리
    let picfile = req.file;
    let result = {
        originalName: picfile.originalname,
        size: picfile.size
    }

    console.log(body);     // 이병문 - 개발과정 확인용(추후삭제).

    if (req.session.auth && req.session.admin) {
        if (body.itemid == '' || datestr == '') {
            console.log("상품번호가 입력되지 않아 DB에 저장할 수 없습니다.");
            res.status(561).end('<meta charset="utf-8">상품번호가 입력되지 않아 등록할 수 없습니다');
        } else {

            prodimage = prodimage + picfile.filename;
            regdate = new Date();
            db.query('INSERT INTO u21_products (itemid, category, maker, pname, modelnum,rdate,price,dcrate,amount,event,pic,pdesc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?)',
                [body.itemid, body.category, body.maker, body.pname, body.modelnum, regdate,
                    body.price, body.dcrate, body.amount, body.event, prodimage, body.pdesc], (error, results, fields) => {
                    if (error) {
                        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
                        res.status(562).end(ejs.render(htmlstream, {
                            'title': '알리미',
                            'warn_title': '상품등록 오류',
                            'warn_message': '상품으로 등록할때 DB저장 오류가 발생하였습니다. 원인을 파악하여 재시도 바랍니다',
                            'return_url': '/'
                        }));
                    } else {
                        console.log("상품등록에 성공하였으며, DB에 신규상품으로 등록하였습니다.!");
                        res.redirect('/adminprod/list/1');
                    }
                });
        }
    } else {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품등록 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }
};


//  -----------------------------------  상품 수정 기능 -----------------------------------------
// 상품수정 입력양식을 브라우져로 출력합니다.
const PrintEditProductForm = (req, res) => {
    let htmlstream = '';

    if (req.session.auth && req.session.admin) { // 관리자로 로그인된 경우에만 처리한다
        htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');    // 헤더부분
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminbar.ejs', 'utf8');  // 관리자메뉴
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/product_form_edit.ejs', 'utf8'); // 상품 수정 메뉴
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');  // Footer
        sql_str = "SELECT * from u21_products where itemid = '" + req.query.itemid + "';"; // 상품조회SQL

        res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
        db.query(sql_str, (err, results, fields) => {
            if (err) {
                res.status(562).end("DB QUERY IS FAILED. (PrintEditProductForm)")
            } else if (results.length <= 0) {
                htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
                res.status(562).end(ejs.render(htmlstream2, {
                    'title': '알리미',
                    'warn_title': '상품조회 오류',
                    'warn_message': '조회된 상품이 없습니다.',
                    'return_url': '/'
                }));
            } else {
                res.end(ejs.render(htmlstream, {
                    'title': '쇼핑몰site',
                    'logurl': '/users/logout',
                    'loglabel': '로그아웃',
                    'regurl': '/users/profile',
                    'reglabel': req.session.who,
                    'prodata': results[0]
                }));
            }
        });

    } else {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품등록 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }
};

// 상품등록 양식에서 입력된 상품정보를 수정(DB에 저장)합니다.
const HandleEditProduct = (req, res) => {  // 상품수정
    let body = req.body;
    let htmlstream = '';
    let datestr, y, m, d, regdate;
    let prodimage = '/images/uploads/products/'; // 상품이미지 저장디렉터리
    let picfile = req.file;
    // let    result = { originalName  : picfile.originalname,
    //     size : picfile.size     }

    if (req.session.auth && req.session.admin) {
        if (body.itemid == '' || datestr == '') {
            console.log("상품번호가 입력되지 않아 DB에 저장할 수 없습니다.");
            res.status(561).end('<meta charset="utf-8">상품번호가 입력되지 않아 등록할 수 없습니다');
        } else {
            if (picfile) {
                prodimage = prodimage + picfile.filename;
            } else {
                prodimage = req.body.imgPreviousPath;
            }
            regdate = new Date();
            console.log(body);
            db.query('UPDATE u21_products set category = ?, maker = ? , pname = ?, modelnum =?,rdate =?,price =?,dcrate =?,amount =? ,event=?,pic=?,pdesc=? where itemid = ?',
                [body.category, body.maker, body.pname, body.modelnum, regdate,
                    body.price, body.dcrate, body.amount, body.event, prodimage, body.pdesc, body.itemid], (error, results, fields) => {
                    if (error) {
                        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
                        res.status(562).end(ejs.render(htmlstream, {
                            'title': '알리미',
                            'warn_title': '상품수정 오류',
                            'warn_message': '상품으로 수정할때 DB저장 오류가 발생하였습니다. 원인을 파악하여 재시도 바랍니다',
                            'return_url': '/'
                        }));
                    } else {
                        console.log("상품수정에 성공하였습니다.");
                        res.redirect('/adminprod/list/1');
                    }
                });
        }
    } else {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품수정 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }
};

const HandleDeleteProduct = (req, res) => {  // 상품수정
    let body = req.body;
    let htmlstream = '';

    if (req.session.auth && req.session.admin) {
        db.query("DELETE FROM u21_products where itemid = ?", [body.itemid], (err, results, field) => {
            if (err) {
                htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
                res.status(562).end(ejs.render(htmlstream, {
                    'title': '알리미',
                    'warn_title': '상품삭제 오류',
                    'warn_message': '삭제할때 DB 오류가 발생하였습니다. 원인을 파악하여 재시도 바랍니다',
                    'return_url': '/'
                }));
            } else {
                console.log("삭제 완료");
                res.redirect('/adminprod/list/1');
            }
        });


    } else {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '상품등록기능 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 상품수정 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }
};

const PrintSales = (req, res) => {
    let htmlstream  = '';
    let body = req.body;

    if(req.session.auth && req.session.admin) {
        htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');    // 헤더부분
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminbar.ejs', 'utf8');  // 관리자메뉴
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/sales.ejs', 'utf8'); // 상품 리스트
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');  // Footer
        db.query("select products_id, category, maker, pname, modelnum,y.amount, sum(x.price * x.amount) as revenue\n" +
            "from u21_orders as x\n" +
            "         left join u21_products as y on (x.products_id = y.itemid)\n" +
            "group by x.products_id;", (err, results, fields) => {
            if (err) {
                res.status(562).end("AdminPrintProd: DB query is failed");
            }else {
                res.end(ejs.render(htmlstream, {
                    'title': '쇼핑몰site',
                    'logurl': '/users/logout',
                    'loglabel': '로그아웃',
                    'regurl': '/users/profile',
                    'reglabel': req.session.who,
                    'salesdata' : results
                }));
            }
        })
    }else{
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
            'title': '알리미',
            'warn_title': '매출관리 오류',
            'warn_message': '관리자로 로그인되어 있지 않아서, 매출관리 기능을 사용할 수 없습니다.',
            'return_url': '/'
        }));
    }
}

// REST API의 URI와 핸들러를 매핑합니다.
router.get('/form', PrintAddProductForm);   // 상품등록화면을 출력처리
router.post('/product', upload.single('photo'), HanldleAddProduct);    // 상품등록내용을 DB에 저장처리
router.get('/list/:page', AdminPrintProd);      // 상품리스트를 화면에 출력
router.get('/edit', PrintEditProductForm);      // 상품리스트를 화면에 출력
router.post('/edit', upload.single('photo'), HandleEditProduct);      //
router.post('/remove', HandleDeleteProduct);      //
router.get('/sales', PrintSales);      // 상품리스트를 화면에 출력

// router.get('/', function(req, res) { res.send('respond with a resource 111'); });

module.exports = router;

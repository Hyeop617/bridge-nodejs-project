const   fs = require('fs');
const   express = require('express');
const   ejs = require('ejs');
const   mysql = require('mysql');
const   bodyParser = require('body-parser');
const   session = require('express-session');
const   crypto = require('crypto')
const   router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));

const   db = mysql.createConnection({
    host: 'localhost',        // DB서버 IP주소
    port: 3306,               // DB서버 Port 주소
    user: 'bmlee',            // DB접속 아이디
    password: 'bmlee654321',  // DB암호
    database: 'bridge'         //사용할 DB명
});

//  -----------------------------------  회원가입기능 -----------------------------------------
// 회원가입 입력양식을 브라우져로 출력합니다.
const PrintRegistrationForm = (req, res) => {
    let    htmlstream = '';

    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/navbar.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/reg_form.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs','utf8');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf8'});

    if (req.session.auth) {  // true :로그인된 상태,  false : 로그인안된 상태
        res.end(ejs.render(htmlstream,  { 'title' : '쇼핑몰site',
            'logurl': '/users/logout',
            'loglabel': '로그아웃',
            'regurl': '/users/profile',
            'reglabel':req.session.who }));
    }
    else {
        res.end(ejs.render(htmlstream, { 'title' : '쇼핑몰site',
            'logurl': '/users/auth',
            'loglabel': '로그인',
            'regurl': '/users/reg',
            'reglabel':'가입' }));
    }

};

// 회원가입 양식에서 입력된 회원정보를 신규등록(DB에 저장)합니다.
const HandleRegistration = (req, res) => {  // 회원가입
    let body = req.body;
    let htmlstream='';

    // 임시로 확인하기 위해 콘솔에 출력해봅니다.
    console.log('회원가입 입력정보 :%s, %s, %s',body.uid, body.pw1, body.uname);

    if (body.uid == '' || body.pw1 == '') {
        console.log("데이터입력이 되지 않아 DB에 저장할 수 없습니다.");
        res.status(561).end('<meta charset="utf-8">데이터가 입력되지 않아 가입을 할 수 없습니다');
    }
    else {
        let passkey = crypto.randomBytes(48);
        let cipher = crypto.createCipher("des",passkey);
        cipher.update(body.pw1, "utf8", "base64");
        let passHash = cipher.final('base64')

        db.query('INSERT INTO u21_users (uid, pass, name,phone, point, passkey) VALUES (?, ?, ?, ?, ?,?)', [body.uid, passHash, body.uname, body.phone, body.point, passkey.toString("base64")], (error, results, fields) => {
            if (error) {
                console.log(error);
                htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs','utf8');
                res.status(562).end(ejs.render(htmlstream, { 'title': '알리미',
                    'warn_title':'회원가입 오류',
                    'warn_message':'이미 회원으로 등록되어 있습니다. 바로 로그인을 하시기 바랍니다.',
                    'return_url':'/' }));
            } else {
                console.log("회원가입에 성공하였으며, DB에 신규회원으로 등록하였습니다.!");
                res.redirect('/');
            }
        });

    }
};

// REST API의 URI와 핸들러를 매핑합니다.
router.get('/reg', PrintRegistrationForm);   // 회원가입화면을 출력처리
router.post('/reg', HandleRegistration);   // 회원가입내용을 DB에 등록처리
router.get('/', function(req, res) { res.send('respond with a resource 111'); });

// ------------------------------------  로그인기능 --------------------------------------

// 로그인 화면을 웹브라우져로 출력합니다.
const PrintLoginForm = (req, res) => {
    let    htmlstream = '';

    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/navbar.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/login_form.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs','utf8');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf8'});

    if (req.session.auth) {  // true :로그인된 상태,  false : 로그인안된 상태
        res.end(ejs.render(htmlstream,  { 'title' : '쇼핑몰site',
            'logurl': '/users/logout',
            'loglabel': '로그아웃',
            'regurl': '/users/profile',
            'reglabel': req.session.who }));
    }
    else {
        res.end(ejs.render(htmlstream, { 'title' : '쇼핑몰site',
            'logurl': '/users/auth',
            'loglabel': '로그인',
            'regurl': '/users/reg',
            'reglabel':'가입' }));
    }

};

// 로그인을 수행합니다. (사용자인증처리)
const HandleLogin = (req, res) => {
    let body = req.body;
    let userid, userpass, username;
    let sql_str;
    let htmlstream = '';

    console.log('로그인 입력정보: %s, %s', body.uid, body.pass);
    if (body.uid == '' || body.pass == '') {
        console.log("아이디나 암호가 입력되지 않아서 로그인할 수 없습니다.");
        res.status(562).end('<meta charset="utf-8">아이디나 암호가 입력되지 않아서 로그인할 수 없습니다.');
    }
    else {
        sql_str = "SELECT uid, pass, name, passkey from u21_users where uid ='"+ body.uid +"';";
        console.log("SQL: " + sql_str);
        db.query(sql_str, (error, results, fields) => {
            if (error) { res.status(562).end("Login Fail as No id in DB!"); }
            else {
                if (results.length <= 0) {  // select 조회결과가 없는 경우 (즉, 등록계정이 없는 경우)
                    htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs','utf8');
                    res.status(562).end(ejs.render(htmlstream, { 'title': '알리미',
                        'warn_title':'로그인 오류',
                        'warn_message':'등록된 계정이 아닙니다.',
                        'return_url':'/' }));
                } else {
                    let decipher = crypto.createDecipher("des", Buffer.from(results[0].passkey, "base64"));
                    decipher.update(results[0].pass, "base64", "utf8");
                    let passPlain = decipher.final("utf8");

                    if (passPlain === body.pass) {
                        userid = results[0].uid;
                        userpass = passPlain;
                        username = results[0].name;
                        console.log("DB에서 로그인성공한 ID/암호:%s/%s", userid, userpass);
                        if (body.uid == userid && body.pass == userpass) {
                            req.session.auth = 99;      // 임의로 수(99)로 로그인성공했다는 것을 설정함
                            req.session.uid = userid;   // userid를 세션에 저장(프로필 수정 위해)
                            req.session.who = username; // 인증된 사용자명 확보 (로그인후 이름출력용)
                            if (body.uid == 'admin')    // 만약, 인증된 사용자가 관리자(admin)라면 이를 표시
                                req.session.admin = true;
                            res.redirect('/');
                        }
                    }else{
                        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs','utf8');
                        res.status(562).end(ejs.render(htmlstream, { 'title': '알리미',
                            'warn_title':'로그인 오류',
                            'warn_message':'비밀번호 오류입니다.',
                            'return_url':'/' }));
                    }
                }
            }  // else
        });
    }
}


// REST API의 URI와 핸들러를 매핑합니다.
//  URI: http://xxxx/users/auth
router.get('/auth', PrintLoginForm);   // 로그인 입력화면을 출력
router.post('/auth', HandleLogin);     // 로그인 정보로 인증처리

// ------------------------------  로그아웃기능 --------------------------------------

const HandleLogout = (req, res) => {
    req.session.destroy();     // 세션을 제거하여 인증오작동 문제를 해결
    res.redirect('/');         // 로그아웃후 메인화면으로 재접속
}

// REST API의 URI와 핸들러를 매핑합니다.
router.get('/logout', HandleLogout);       // 로그아웃 기능


// --------------- 정보변경 기능을 개발합니다 --------------------
const PrintProfile = (req, res) => {
    let    htmlstream = '';

    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs','utf8');
    if (req.session.auth && req.session.admin) {  // 만약, 관리자가 로그인했다면
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/adminbar.ejs','utf8');  // 관리자메뉴
    } else {
        htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/navbar.ejs','utf8');  // 일반사용자메뉴
    }
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/profile_form.ejs','utf8');
    htmlstream = htmlstream + fs.readFileSync(__dirname + '/../views/footer.ejs','utf8');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf8'});
    console.log(req.session)

    if (req.session.auth) {  // true :로그인된 상태,  false : 로그인안된 상태
        res.end(ejs.render(htmlstream,  { 'title' : '쇼핑몰site',
            'logurl': '/users/logout',
            'loglabel': '로그아웃',
            'regurl': '/users/profile',
            'reglabel':req.session.who }));
    }
    else {
        res.end(ejs.render(htmlstream, { 'title' : '쇼핑몰site',
            'logurl': '/users/auth',
            'loglabel': '로그인',
            'regurl': '/users/reg',
            'reglabel':'가입' }));
    }
}

const HandleProfileEdit = (req,res) => {
    let body = req.body;
    let userid, userpass, username;
    let htmlstream = '';

    let passkey = crypto.randomBytes(48);
    let cipher = crypto.createCipher("des",passkey);
    cipher.update(body.pw1, "utf8", "base64");
    let passHash = cipher.final('base64')

    console.log("passhash : " + passHash)
    console.log("phone : " + body.phone)
    console.log("key : " + passkey)
    console.log("uid : " + req.session.uid)

    db.query("UPDATE u21_users set pass = ?, phone = ?, passkey = ? where uid = ?", [passHash, body.phone, passkey.toString("base64"), req.session.uid], (error, results, field) => {
        if (error) { res.status(562).end("Login Fail as No id in DB!"); }
        else {
            console.log("수정 성공");
            res.redirect('/');
        }
    })
};

router.get('/profile', PrintProfile);     // 정보변경화면을 출력
router.post('/profile', HandleProfileEdit);     // 정보변경화면을 출력

module.exports = router;

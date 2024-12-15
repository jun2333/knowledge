//对象关联委托编写风格
let loginController = {
    pwd: '',
    userPwd: '',
    setUserPwd(userPwd) {
        console.log(`userPwd:${userPwd}`);
        this.userPwd = userPwd;
    },
    setPwd(pwd) {
        console.log(`pwd:${pwd}`);
        this.pwd = pwd;
    },
};
let authController = {
    checkPwd() {
        if (this.pwd === this.userPwd) return true;
        else return false;
    },
};

Object.setPrototypeOf(authController, loginController); //将authcontroller关联loginController

let auth = Object.create(authController);

auth.setUserPwd('123123');
auth.setPwd(123123)
console.log(auth.checkPwd())

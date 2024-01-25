import express  from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import passport from "passport"
import cookieSession from "cookie-session"
import dotenv from 'dotenv';
import cors from 'cors'
import bcrypt from 'bcrypt'
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
const saltRounds=10;
const PORT = process.env.PORT || 5000;
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json({limit:"50mb"})); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	cookieSession({
		name: "session",
		keys: ["cyberwolve"],
		maxAge: 24 * 60 * 60 * 1000,
	})
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://DatTC215346:hust20210399@todolist.afobiup.mongodb.net/").then(()=>{
console.log("thành công")}).catch(()=>{console.log("Thất bại")});
const userSchema=new mongoose.Schema({ 
    email:String,
    password:String, 
    googleId:String
});
const User=mongoose.model("User",userSchema);
const todo=new mongoose.Schema({
  userId:String,
  title:String,
  content:String
});
const Todo=mongoose.model("Todo",todo);
app.post('/login', (req, res) => {
  const email=req.body.email;
  const password=req.body.password;
  User.findOne({email:email}).then((user)=>{
    if(user){
        bcrypt.compare(password, user.password).then(function(result) {
            if(result===true){
                res.send({
                    state:"ok",
                    user:{
                        id:user._id,
                    }
                });
            }
            else{
                res.send("Mật khẩu không chính xác");
            }
        });
    }
    else{
        res.send("Tài khoản chưa được đăng kí, vui lòng đăng kí tài khoản");
    }
})
});
app.post("/register",(req,res)=>{
  const email=req.body.email;
  console.log(req.body.password);
  User.exists({email:email}).then((result)=>{
    if(result===null){
        var id;
        bcrypt.hash(req.body.password, saltRounds).then(function(hash) {
            // Store hash in your password DB.
            const newUser=new User({
                email:req.body.email,
                password:hash,
                googleId:""
            });
            newUser.save().then((result)=>{
                res.status(200).send({
                    state:"oke",
                    user:{
                        id:result._id,
                    }
                });
            }).catch((err)=>console.log(err));
            console.log(id)
          
        });
        
        
    }
    else res.send("Tài khoản đã tồn tại");
});
})


// Đăng nhập với google
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "/google/todolist",
			scope: ["profile", "email"],
		},
        async function (accessToken, refreshToken, profile, callback) {
			console.log(profile)
            try {
                // Tìm kiếm người dùng trong cơ sở dữ liệu bằng Google ID
                const existingUser = await User.findOne({ googleId: profile.id });
         
                if (existingUser) {
					        console.log("Đã xử lý");
                  return callback(null, existingUser._id);
                }
				
                // Nếu người dùng không tồn tại, tạo một bản ghi mới
                const newUser = await User.create({ 
					
					        email:"",
					        password:"",
					        googleId: profile.id,
				 });
				 
                // Gọi callback để tiếp tục quá trình xác thực
                return callback(null, newUser._id);
              } catch (err) {
                // Xử lý lỗi nếu có
                return callback(err, null);
              }
			callback(null, profile);

		}
	)
);
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});
app.get("/login/success", (req, res) => {
	if (req.user) {
		User.findOne({_id:req.user}).then((user)=>{
			res.status(200).json({
				error: false,
				message: "Successfully Loged In",
				user: {
					id:user._id,
				},
			});
		})
		
	} else {
		res.status(403).json({ error: true, message: "Not Authorized" });
	}
});

app.get("/login/failed", (req, res) => {
	res.status(401).json({
		error: true,
		message: "Log in failure",
	});
});

app.get("/google", passport.authenticate("google", ["profile", "email"]));
app.get(
	"/google/todolist",
	passport.authenticate("google", {
		successRedirect: "http://localhost:3000",
		failureRedirect: "/login/failed",
	})
);
app.get("/logout", (req, res) => {
	req.logout();
	res.redirect("http://localhost:3000");
});
////////////////////////////// 
app.post("/newTodo",(req,res)=>{
  const userId=req.body.userID;
  
  const newTodo= new Todo({
    userId:userId,
    title:req.body.title,
    content:req.body.content
  })
  newTodo.save();
  res.send("oke");
})
app.post("/deleteTodo", async (req, res) => {
    try {
        const userId = req.body.userID;
        const conditions = {
            $and: [
                { userId: userId },
                { title: req.body.title },
                { content: req.body.content }
            ],
        };
        const result = await Todo.findOneAndDelete(conditions);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.post("/getAll", async (req,res)=>{
    await Todo.find({userId:req.body.userID}).then(result=>{
        res.send(result);
    })
})
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
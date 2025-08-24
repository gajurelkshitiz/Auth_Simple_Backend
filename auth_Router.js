import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';


// hash the env password
const salt = bcrypt.genSaltSync(15);
const hashedEnvPassword = bcrypt.hashSync(process.env.PASSWORD, salt);


router.post("/login", (req, res, next) => {
    console.log("req body is: ", req.body);
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and Password both fields required." });
    }
    if (username === process.env.USERNAME) {
        // Compare entered password with env password (hashed)
        const isMatch = bcrypt.compareSync(password, hashedEnvPassword);
        if (isMatch) {
            return res.status(200).json({ msg: `Successfully Logged In.` });
        } else {
            return res.status(401).json({ error: "Invalid Password." });
        }
    } else {
        return res.status(401).json({ error: "Invalid Username or Password." });
    }
});

export default router;
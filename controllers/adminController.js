import Admin from "../models/admin.js";


const createAdmin = async(req, res) => {
    console.log('Yaha samma sucess chha.')
    const { email, password } = req.body;
    console.log(req.body);
    if(!email || !password) {
        throw new Error("Email and Password cannot be empty");
        
    }
    const admin = await Admin.create({
        email,
        password
    });

    res.status(200).json({
        message: "Admin was sucessfully created.",
        admin
    })
}


export default createAdmin;
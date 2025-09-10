import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Email Not Valid",
        ],
        unique: true,
    },
    password: {
        type: String,
    }
})

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;


/*
// centralized server:


'Admin database':
A> Timur Resturant:  timur@gmail.com

B> Cafe Grill to chill: grill@gmail.com


'Manager database':
Timur
1. manager1@gmail.com   ---> sync with ----> 'admin' --> timur@gmail.com
2. manager2@gmail.com   ---> sync with ----> 'admin' --> timur@gmail.com


Grill
1.


'staff database':


*/
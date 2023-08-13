import axios from "axios";
import { RegisterUser } from "../page/register/Register";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3005/",
  timeout: 3000,
});

export async function httpLogin(username: string, password: string) {
  return await axiosInstance.post("/user/login", {
    username,
    password,
  });
}

export async function httpRegisterCaptcha(email: string) {
  return await axiosInstance.get("/user/register-captcha", {
    params: {
      address: email,
    },
  });
}

export async function httpRegister(registerUser: RegisterUser) {
  return await axiosInstance.post("/user/register", registerUser);
}

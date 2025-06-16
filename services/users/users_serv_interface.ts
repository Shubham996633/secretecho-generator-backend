import { getUserDetails, login, logout, signup } from "./users_serv";

export const UserService = {
    signup,
    login,
    getUserDetails,
	logout
};
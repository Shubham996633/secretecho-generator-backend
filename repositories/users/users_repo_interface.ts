import { create, findByEmail, findById, findByPid } from "./users_repo";

export const UserRepository = {
    create,
    findByEmail,
    findById,
    findByPid
};
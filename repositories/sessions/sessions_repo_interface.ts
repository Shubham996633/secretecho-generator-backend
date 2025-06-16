import { create, deleteByPid, getActiveSessionsByUserId, getByPid } from "./sessions_repo";

export const SessionRepository = {
	create,
    getActiveSessionsByUserId,
    getByPid,
    deleteByPid
};

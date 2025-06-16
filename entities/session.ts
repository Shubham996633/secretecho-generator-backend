import mongoose, { Schema } from 'mongoose';


export interface ISession {
    session_pid: string;
    user_id: mongoose.Types.ObjectId; 
    expiry_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

const SessionSchema: Schema = new Schema({
    session_pid: { type: String, required: true, unique: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiry_at: { type: Date, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);
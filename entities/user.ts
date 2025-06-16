import mongoose, { Schema, Document } from 'mongoose';

export interface IUser {
    _id: mongoose.Types.ObjectId; 
    user_pid: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    created_at: Date;
    updated_at: Date;
    user_quota?: {
        max_simultaneous_sessions: number;
    };
}

const UserSchema: Schema = new Schema({
    user_pid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    user_quota: {
        max_simultaneous_sessions: { type: Number, default: 3 }
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);

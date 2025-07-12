import mongoose, { Document, Model, Schema } from "mongoose";


export interface IPasswordReset extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  fullName: string;
}

const passwordResetSchema: Schema<IPasswordReset> = new Schema<IPasswordReset>(
  {
    email: { type: String, unique: true, required: true },
    fullName: { type: String, required: true },
        otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const PasswordOTPResetOTP: Model<IPasswordReset> = mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema);

export default PasswordOTPResetOTP;
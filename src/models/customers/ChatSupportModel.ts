import mongoose, { Schema, Document, Model } from 'mongoose';
import { CommonDBInterface } from '../../lib/interfaces/DBinterfaces';
 
export interface IMessage extends Document,CommonDBInterface {
  sender_id: mongoose.Types.ObjectId;
  message_text: string;              
  sent_at: Date;                      
  message_type: 'text' | 'image' | 'file';

}
 
export interface IChat extends Document {
  user_id: mongoose.Types.ObjectId;       
  support_agent_id: mongoose.Types.ObjectId; 
  messages: IMessage[];                  
  status: 'open' | 'closed' | 'in-progress'; 
  created_at: Date;                        
  updated_at: Date;                        
  last_message_timestamp: Date;           
  resolved_by?: mongoose.Types.ObjectId;  
}
export const MessageSchema: Schema<IMessage> = new Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sender_type', 
      required: true,
    },
    message_text: { type: String, required: true },
    sent_at: { type: Date, default: Date.now },
    message_type: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
  },
 
);
 

export const ChatSchema: Schema<IChat> = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
    support_agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportAgent',
      required: true,
    },
    messages: [MessageSchema],
    status: {
      type: String,
      enum: ['open', 'closed', 'in-progress'],
      default: 'open',
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_message_timestamp: { type: Date, default: Date.now },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportAgent', 
      required: false,
    },
  },
 
);
 
 
 
const Chat: Model<IChat> = mongoose.model<IChat>('Chat', ChatSchema);
export default Chat;
 
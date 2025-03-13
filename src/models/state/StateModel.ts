import mongoose, { Document, Model, Schema } from "mongoose";

export interface IState extends Document {
  id: number;
  
  name: string;
  country_name: string; 
  country_id:number
}

  const stateSchema: Schema<IState> = new Schema<IState>(
    {
      id: { type: Number, unique: true }, 
      name: { type: String, required: true, unique: true }, 
      country_id: { type: Number, required: true, unique: true },
      country_name: { type: String, required: true } 
    },
    { timestamps: true }
  );


const State: Model<IState> = mongoose.model<IState>("State", stateSchema);

export default State;

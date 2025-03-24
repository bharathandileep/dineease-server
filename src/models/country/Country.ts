import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICountry extends Document {
  id: number; 
  name: string;
  phone_code: string;
}

const countrySchema: Schema<ICountry> = new Schema<ICountry>(
  {
    id: { type: Number, unique: true }, 
    name: { type: String, required: true, unique: true }, 
    phone_code: { type: String, required: true } 
  },
  { timestamps: true }
);

const Country: Model<ICountry> = mongoose.model<ICountry>("Country", countrySchema, "countries");

export default Country;
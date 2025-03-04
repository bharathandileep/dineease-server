// import mongoose, { Document, Model, Schema } from "mongoose";

// // Define the interface for the Country document
// export interface ICountry extends Document {
//   id: number; // Unique country ID
//   name: string;
//   phone_code: string;
// }

// // Create the schema for the Country model
// const countrySchema: Schema<ICountry> = new Schema<ICountry>(
//   {
//     id: { type: Number, unique: true }, // Unique country ID
//     name: { type: String, required: true, unique: true }, // Country name
//     phone_code: { type: String, required: true } // Country phone code
//   },
//   { timestamps: true }
// );

// // Create the model for the Country schema
// const Country: Model<ICountry> = mongoose.model<ICountry>("Country", countrySchema,countries)

// export default Country;

import mongoose, { Document, Model, Schema } from "mongoose";

// Define the interface for the Country document
export interface ICountry extends Document {
  id: number; // Unique country ID
  name: string;
  phone_code: string;
}

// Create the schema for the Country model
const countrySchema: Schema<ICountry> = new Schema<ICountry>(
  {
    id: { type: Number, unique: true }, // Unique country ID
    name: { type: String, required: true, unique: true }, // Country name
    phone_code: { type: String, required: true } // Country phone code
  },
  { timestamps: true }
);

// Create the model for the Country schema
const Country: Model<ICountry> = mongoose.model<ICountry>("Country", countrySchema, "countries");

export default Country;
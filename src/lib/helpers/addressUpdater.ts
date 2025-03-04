import mongoose, { Model } from "mongoose";
import Address from "../../models/address/AddressModel";

export const createAddressAndUpdateModel = async (
  model: Model<any>,
  modelId: any,
  addressDetails: any
): Promise<void> => {
  try {
    const newAddress = new Address(addressDetails);
    const savedAddress = await newAddress.save();
    await model.findByIdAndUpdate(modelId, {
      $push: { address_id: savedAddress._id },
    });
  } catch (error: any) {
    throw new Error(
      `Error creating address or updating ${model.modelName}: ${error.message}`
    );
  }
};

export const updateAddress = async (
  model: Model<any>,
  modelId: any,
  addressData: any
) => {

  const organization = await model.findById(modelId);
  if (!organization || !organization.address_id?.length) {
    return null;
  }

  // Update all addresses with matching address_type or create new one if not found
  const addressUpdates = await Promise.all(
    organization.address_id.map(async (addressId: string) => {
      const existingAddress = await Address.findById(addressId);
      if (existingAddress?.address_type === addressData.address_type) {
        return Address.findByIdAndUpdate(addressId, {
          street_address: addressData.street_address,
          city: addressData.city,
          state: addressData.state,
          district: addressData.district,
          pincode: addressData.pincode,
          country: addressData.country,
          address_type: addressData.address_type,
        });
      }
      return null;
    })
  );
};

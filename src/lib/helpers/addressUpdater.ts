import mongoose, { Model } from "mongoose";
import Address from "../../models/address/AddressModel";
import City from "../../models/city/City";
import State from "../../models/state/StateModel";
import District from "../../models/district/District";
import Country from "../../models/country/Country";

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
export const getFullAddressById = async (addressId: any) => {
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("Invalid address ID");
  }

  const address = await Address.findOne({
    _id: new mongoose.Types.ObjectId(addressId),
    is_deleted: false,
  }).lean();

  if (!address) {
    throw new Error("Address not found");
  }

  // Convert IDs to numbers for lookup
  const cityId = /^\d+$/.test(address.city) ? parseInt(address.city) : null;
  const stateId = /^\d+$/.test(address.state) ? parseInt(address.state) : null;
  const districtId = /^\d+$/.test(address.district)
    ? parseInt(address.district)
    : null;
  const countryId = /^\d+$/.test(address.country)
    ? parseInt(address.country)
    : null;
  const [city, state, district, country] = await Promise.all([
    cityId ? City.findOne({ id: cityId }).lean() : null,
    stateId ? State.findOne({ id: stateId }).lean() : null,
    districtId ? District.findOne({ id: districtId }).lean() : null,
    countryId ? Country.findOne({ id: countryId }).lean() : null,
  ]);
  return {
    _id: address._id,
    street_address: address.street_address,
    pincode: address.pincode,
    landmark: address.landmark,
    address_type: address.address_type,

    city_id: address.city,
    city_name: city?.name || null,

    state_id: address.state,
    state_name: state?.name || null,

    district_id: address.district,
    district_name: district?.name || null,

    country_id: address.country,
    country_name: country?.name || null,
  };
};

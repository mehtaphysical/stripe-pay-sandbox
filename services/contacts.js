import { MongoClient } from "mongodb";

const validateEmail = (email) => {
  return email && email.length < 1024;
};

const validatePhoneNumber = (phoneNumber) => {
  return phoneNumber && phoneNumber.length < 30;
};

export const storeContact = async ({ accountId, email, phoneNumber }) => {
  try {
    const updateObj = {};
    if (validateEmail(email)) updateObj.email = email;
    if (validatePhoneNumber(phoneNumber)) updateObj.phoneNumber = phoneNumber;

    if (updateObj.email || updateObj.phoneNumber) {
      const client = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      await client.db().collection("contacts").update(
        {
          accountId,
        },
        { $set: updateObj },
        { upsert: true }
      );
    }
  } catch (err) {
    console.log(`Unable to store contact info: ${err.message}`);
  }
};

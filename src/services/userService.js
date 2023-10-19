const { userDao } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { throwError } = require('../utils/throwError');
const { keyCheck } = require('../utils/keyCheck');

const findUser = async (userId) => {
  return await userDao.findById(userId);
};

const signUp = async (
  name,
  email,
  password,
  phoneNumber,
  zipCode,
  address,
  addressDetails
) => {
  const emailRegx = /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  if (!email.match(emailRegx)) throwError(400, 'INVALID_EMAIL');

  const existingUser = await userDao.findByEmail(email);
  if (existingUser) throwError(400, 'DUPLICATED_EMAIL_ADDRESS');

  const passwordRegx = /^(?=.*[0-9])(?=.*[a-z])(?=.*\W)(?!.* ).{8,16}$/;
  if (!password.match(passwordRegx)) throwError(400, 'INVALID_PASSWORD');

  const saltRounds = 12;
  const bcryptPassword = await bcrypt.hash(password, saltRounds);

  await userDao.signUp(
    name,
    email,
    bcryptPassword,
    phoneNumber,
    zipCode,
    address,
    addressDetails
  );
};

const signIn = async (email, password) => {
  const existingUser = await userDao.findByEmail(email);
  if (!existingUser) throwError(400, 'USER_NOT_FOUND');
  let isSeller = false;
  if (existingUser.seller_id != null) isSeller = true;

  const checkPassword = await bcrypt.compare(password, existingUser.password);
  if (!checkPassword) throwError(400, 'WRONG_PASSWORD');

  const token = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET);

  return { accessToken: token, isSeller: isSeller };
};

const sellerSignUp = async (
  name,
  image,
  zipCode,
  address,
  addressDetails,
  phoneNumber,
  userId
) => {
  const exisitingSeller = await userDao.findSeller(name);
  if (exisitingSeller) throwError(400, 'INVALID_NAME');

  const exisitingUser = await userDao.findById(userId);
  if (exisitingUser.seller_id !== null) throwError(400, 'ALREADY_SELLER');

  await userDao.sellerSignUp(
    name,
    image,
    zipCode,
    address,
    addressDetails,
    phoneNumber,
    userId,
    sellerId
  );
};

const kakaoSignIn = async (code) => {
  let kakaoToken;

  const queryString = `grant_type=authorization_code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&code=${code}`;

  await axios
    .post(`https://kauth.kakao.com/oauth/token`, queryString, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    })
    .then((res) => {
      kakaoToken = res.data.access_token;
    })
    .catch((err) => {
      console.log('마 여기다', err);
    });

  let result;
  await axios
    .get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${kakaoToken}`,
      },
    })
    .then((res) => {
      result = res.data;
    })
    .catch((err) => {
      console.log('에러임 ㅋ');
    });

  const kakaoId = result.id;
  const name = result.properties.nickname;
  const email = result.kakao_account.email;

  keyCheck({
    kakaoId,
    name,
    email,
  });

  const user = await userDao.findByKakao(kakaoId);

  let userId;

  if (!user) {
    const result = await userDao.kakaoSignIn(kakaoId, name, email);
    userId = result.insertId;
  } else {
    userId = user.id;
  }

  const existingUser = await userDao.findByEmail(email);
  let isSeller = false;
  let isAddress = false;
  if (existingUser.seller_id != null) isSeller = true;
  if (existingUser.zip_code != null) isAddress = true;

  const token = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET);

  return { accessToken: token, isSeller: isSeller, isAddress: isAddress };
};

const insertAddress = async (
  phoneNumber,
  zipCode,
  address,
  addressDetails,
  userId
) => {
  const exisitingUser = await userDao.findById(userId);

  if (exisitingUser.zip_code) throwError(409, 'ALREADY');
  await userDao.insertAddress(
    phoneNumber,
    zipCode,
    address,
    addressDetails,
    userId
  );
};

module.exports = {
  findUser,
  signUp,
  signIn,
  sellerSignUp,
  kakaoSignIn,
  insertAddress,
};

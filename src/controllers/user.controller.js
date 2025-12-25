import prisma from "../lib/prismaClient.js";

export const getUserById = async (userId) => {
    const {id} = req.user;
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};
export const createUser = async (userData) => {
  return await prisma.user.create({
    data: userData,
  });
};

export const updateUser = async (userId, updateData) => {
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
};

export const deleteUser = async (userId) => {
  return await prisma.user.delete({
    where: { id: userId },
  });
};
export const getAllUsers = async () => {
  return await prisma.user.findMany();
};

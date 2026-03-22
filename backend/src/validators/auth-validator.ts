import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(4).max(30).required(),
  password: Joi.string().min(10).max(100).required()
});

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

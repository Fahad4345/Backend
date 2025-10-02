function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isPhone(input) {
  return /^\d{10,15}$/.test(input);
}
export { isEmail, isPhone };

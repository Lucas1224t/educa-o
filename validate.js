exports.str = (v) => (typeof v === "string" ? v.trim() : "");
exports.isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;
exports.isUsername = (v) => /^[A-Za-z0-9_.-]{3,30}$/.test(v);
exports.isName = (v) => v.length >= 3 && v.length <= 100;

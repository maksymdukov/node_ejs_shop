const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [
            {
                productId: {type: Schema.Types.ObjectId, required: true, ref: 'Product'},
                quantity: {type: Number, required: true}
            }
        ]
    }
});

userSchema.methods.addToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });
    let updatedCartItems = [...this.cart.items];
    let newQuantity = 1;
    if (cartProductIndex >= 0) {
        newQuantity = updatedCartItems[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
        updatedCartItems.push({productId: product._id, quantity: newQuantity});
    }
    this.cart = {items: updatedCartItems};
    return this.save();
};

userSchema.methods.removeFromCart = function (prodId) {
    const updatedCart = this.cart.items.filter(p => p.productId.toString() !== prodId);
    this.cart.items = updatedCart;
    return this.save();
};

userSchema.methods.clearCart = function () {
    this.cart = {items: []};
    return this.save();
}

module.exports = mongoose.model('User', userSchema);
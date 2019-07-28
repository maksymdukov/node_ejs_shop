const path = require("path");
const fs = require("fs");
const PdfDocument = require("pdfkit");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    let totalItems;
    const page = +req.query.page || 1;
    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render("shop/product-list", {
                prods: products,
                pageTitle: "Products",
                path: "/products",
                totalProducts: totalItems,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
    // Product.find()
    // // .select('title price userId -_id')
    // // .populate('userId', 'name')
    //     .then(products => {
    //         console.log(products);
    //         res.render('shop/product-list', {
    //             prods: products,
    //             pageTitle: 'All Products',
    //             path: '/products',
    //         });
    //     })
    //     .catch(err => {
    //         const error = new Error(err);
    //         error.httpStatusCode = '500';
    //         next(error);
    //     });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render("shop/product-detail", {
                product: product,
                pageTitle: product.title,
                path: "/products"
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.getIndex = (req, res, next) => {
    let totalItems;
    const page = +req.query.page || 1;
    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render("shop/index", {
                prods: products,
                pageTitle: "Shop",
                path: "/",
                totalProducts: totalItems,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then(results => {
            const products = results.cart.items;
            console.log(products);
            res.render("shop/cart", {
                path: "/cart",
                pageTitle: "Your Cart",
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.getCheckout = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then(results => {
            const products = results.cart.items;
            const total = products.reduce(
                (sum, p) => sum + p.quantity * p.productId.price,
                0
            );
            console.log(products);
            res.render("shop/checkout", {
                path: "/checkout",
                pageTitle: "Checkout",
                products: products,
                totalSum: total
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect("/cart");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => res.redirect("/cart"))
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render("shop/orders", {
                path: "/orders",
                pageTitle: "Your Orders",
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.postOrder = (req, res, next) => {
    let totalSum;
    // Token is created using Checkout or Elements!
    // Get the payment token ID submitted by the form:
    const token = req.body.stripeToken; // Using Express

    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then(results => {
            totalSum = results.cart.items.reduce(
                (sum, p) => sum + p.quantity * p.productId.price,
                0
            );
            const products = results.cart.items.map(i => ({
                quantity: i.quantity,
                product: i.productId.toObject()
            }));
            const order = new Order({
                user: {
                    userId: req.user,
                    email: req.user.email
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            stripe.charges.create({
                amount: totalSum * 100,
                currency: "usd",
                description: "Demo order",
                source: token,
                metadata: { order_id: result._id.toString() }
            });
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = "500";
            next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                const error = new Error("Order is not found.");
                return next(error);
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                const error = new Error("Not Authorized");
                return next(error);
            }
            const invoiceName = "invoice-" + orderId + ".pdf";
            const invoicePath = path.join("data", "invoices", invoiceName);
            res.setHeader("Content-type", "application/pdf");
            res.setHeader(
                "Content-disposition",
                'attachment; filename="' + invoiceName + '"'
            );
            const pdfDoc = new PdfDocument();
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);
            pdfDoc.fontSize(24).text("Hello World!", {
                underline: true
            });
            pdfDoc.text("-----------");
            let total = 0;
            order.products.forEach(prod => {
                total += prod.product.price * prod.quantity;
                pdfDoc
                    .fontSize("18")
                    .text(
                        `${prod.product.title} - ${prod.quantity} x $${
                            prod.product.price
                        }`
                    );
            });
            pdfDoc.text("-----------");
            pdfDoc.fontSize(22).text(`Total Price: $${total}`);
            pdfDoc.end();

            // fs.readFile(invoicePath, (err, data) => {
            //     if (err) {
            //         return next(err);
            //     }
            //     res.setHeader('Content-type', 'application/pdf');
            //     res.setHeader('Content-disposition', 'attachment; filename="' + invoiceName + '"');
            //     res.send(data);

            // const invoiceName = 'invoice-' + orderId + '.pdf';
            // const invoicePath = path.join('data', 'invoices', invoiceName);
            // const file = fs.createReadStream(invoicePath);
            // res.setHeader('Content-type', 'application/pdf');
            // res.setHeader('Content-disposition', 'attachment; filename="' + invoiceName + '"');
            // file.pipe(res);
        })
        .catch(err => {
            next(err);
        });
};

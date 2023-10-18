const { AppDataSource } = require('./dataSource');

const getCategoryNameById = async (categoryId) => {
  const name = await AppDataSource.query(
    `select product_categories.category_name FROM product_categories
    WHERE product_categories.id=${categoryId}`
  );

  return name;
};

const getSellerNameById = async (sellerId) => {
  const name = await AppDataSource.query(
    `select name FROM sellers
    WHERE sellers.id=${sellerId}`
  );

  return name;
};

const getProducts = async (
  orderingQuery,
  joinQuery,
  whereQuery,
  limitOffsetQuery
) => {
  let query = `SELECT 
  products.id AS productId,
  products.name AS productName,
  products.images AS productImg,
  products.price AS originalPrice,
  products.discount_rate AS discountRate,
  products.price * (products.discount_rate / 100) AS discountAmount,
  products.price - (products.price * (products.discount_rate / 100)) AS totalPrice,
  (
    SELECT COUNT(reviews.product_id)
    FROM reviews
    WHERE reviews.product_id = products.id
) AS reviewNumber,
  IFNULL((
    SELECT IFNULL(SUM(reviews.rating), 0) / IFNULL(COUNT(reviews.product_id), 1)
    FROM reviews
    WHERE reviews.product_id = products.id), 0) AS rating
   FROM products
   ${joinQuery}
   WHERE 1=1
   ${whereQuery}
   ${orderingQuery}
   ${limitOffsetQuery}
   `;

  // query += joinQuery;
  // query += whereQuery(categoryId);
  // query += orderingQuery;

  const products = await AppDataSource.query(query);
  return products;
};

const getProductBySellerId = async (
  whereQuery,
  orderingQuery,
  limit,
  offset
) => {
  let query = `SELECT 
  products.id AS productId,
  products.name AS productName,
  products.images AS productImg,
  products.price AS originalPrice,
  products.discount_rate AS discountRate,
  products.price * (products.discount_rate / 100) AS discountAmount,
  products.price - (products.price * (products.discount_rate / 100)) AS totalPrice,
  (
    SELECT COUNT(reviews.product_id)
    FROM reviews
    WHERE reviews.product_id = products.id
) AS reviewNumber,
  IFNULL((
    SELECT IFNULL(SUM(reviews.rating), 0) / IFNULL(COUNT(reviews.product_id), 1)
    FROM reviews
    WHERE reviews.product_id = products.id), 0) AS rating
   FROM products
   WHERE 1=1
   ${whereQuery}
   `;

  query += orderingQuery;

  query += `
    LIMIT ${limit} OFFSET ${offset}`;
  const products = await AppDataSource.query(query);
  return products;
};

module.exports = {
  getCategoryNameById,
  getSellerNameById,
  getProducts,
  getProductBySellerId,
};

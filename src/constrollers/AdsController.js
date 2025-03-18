const { v4: uuid } = require("uuid");
const Jimp = require("jimp");

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinaryConfig");

const Category = require("../models/Category");
const User = require("../models/User");
const Ad = require("../models/Ad");
const StateModel = require("../models/State");
const sharp = require("sharp");

const addImage = async (buffer) => {
  let newName = `${uuid()}.jpg`;

  let convertedBuffer = await sharp(buffer).jpeg().toBuffer();

  let tmpImg = await Jimp.read(convertedBuffer);
  tmpImg.cover(500, 500).quality(80);

  await tmpImg.writeAsync(`./public/media/${newName}`);

  return newName;
};

module.exports = {
  getCategories: async (req, res) => {
    const cats = await Category.find();

    let categories = [];
    for (let i in cats) {
      categories.push({
        ...cats[i],
        img: `${process.env.BASE}/assets/images/${cats[i].slug}.png`,
      });
    }

    res.json({ categories });
  },
  addAction: async (req, res) => {
    let { title, price, priceneg, desc, cat, token } = req.body;
    const user = await User.findOne({ token }).exec();

    if (!title || !cat) {
      res.json({ error: "Título e/ou categoria não foram preenchidos" });
      return;
    }

    if (cat.length < 12) {
      res.json({ error: "ID de categoria inválido" });
      return;
    }

    const category = await Category.findById(cat);
    if (!category) {
      res.json({ error: "Categoria inexistente" });
      return;
    }

    if (price) {
      price = price.replace(".", "").replace(",", ".").replace("R$ ", "");
      price = parseFloat(price);
    } else {
      price = 0;
    }

    const newAd = new Ad({
      status: true,
      idUser: user._id,
      state: user.state,
      dateCreated: new Date(),
      title,
      category: cat,
      price,
      priceNegotiable: priceneg === "true",
      description: desc,
      views: 0,
      images: [],
    });

    if (req.files && req.files.img) {
      const images = Array.isArray(req.files.img)
        ? req.files.img
        : [req.files.img];

      for (const img of images) {
        if (["image/jpeg", "image/jpg", "image/png"].includes(img.mimetype)) {
          try {
            const result = await cloudinary.uploader.upload_stream(
              {
                folder: "ads",
                public_id: uuid(),
                transformation: [{ width: 500, height: 500, crop: "limit" }],
              },
              (error, uploadResult) => {
                if (error) {
                  console.error("Erro ao enviar para o Cloudinary:", error);
                } else {
                  newAd.images.push({
                    url: uploadResult.secure_url,
                    default: false,
                  });

                  if (newAd.images.length === 1) {
                    newAd.images[0].default = true;
                  }

                  newAd.save();
                }
              }
            );

            result.end(img.data);
          } catch (error) {
            console.error("Erro ao processar a imagem:", error);
          }
        }
      }
    }

    const info = await newAd.save();
    res.json({ id: info._id });
  },
  getList: async (req, res) => {
    let { sort = "asc", offset = 0, limit = 8, q, cat, state } = req.query;
    let filters = { status: true };
    let total = 0;

    if (q) {
      filters.title = { $regex: q, $options: "i" };
    }

    if (cat) {
      const c = await Category.findOne({ slug: cat }).exec();
      if (c) {
        filters.category = c._id.toString();
      }
    }

    if (state) {
      const s = await StateModel.findOne({ name: state.toUpperCase() }).exec();
      if (s) {
        filters.state = s._id.toString();
      }
    }

    const adsTotal = await Ad.find(filters).exec();
    total = adsTotal.length;

    const adsData = await Ad.find(filters)
      .sort({ dateCreated: sort == "desc" ? -1 : 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .exec();

    let ads = [];
    for (let i in adsData) {
      let image;

      let defaultImg = adsData[i].images.find((e) => e.default);
      if (defaultImg) {
        image = `${process.env.BASE}/media/${defaultImg.url}`;
      } else {
        image = `${process.env.BASE}/media/default.jpg`;
      }

      ads.push({
        id: adsData[i]._id,
        title: adsData[i].title,
        price: adsData[i].price,
        priceNegotiable: adsData[i].priceNegotiable,
        image,
      });
    }

    res.json({ ads, total });
  },
  getItem: async (req, res) => {
    let { id, other = null } = req.query;

    if (!id) {
      res.json({ error: "Sem produto" });
      return;
    }

    if (id.length < 12) {
      res.json({ error: "ID inválido" });
      return;
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      res.json({ error: "Produto inexistente" });
      return;
    }

    ad.views++;
    await ad.save();

    let images = [];
    for (let i in ad.images) {
      images.push(`${process.env.BASE}/media/${ad.images[i].url}`);
    }

    let category = await Category.findById(ad.category).exec();
    let userInfo = await User.findById(ad.idUser).exec();
    let stateInfo = await StateModel.findById(ad.state).exec();

    let others = [];
    if (other) {
      const otherData = await Ad.find({
        status: true,
        idUser: ad.idUser,
      }).exec();

      for (let i in otherData) {
        if (otherData[i]._id.toString() != ad._id.toString()) {
          let image = `${process.env.BASE}/media/default.jpg`;

          let defaultImg = otherData[i].images.find((e) => e.default);
          if (defaultImg) {
            image = `${process.env.BASE}/media/${defaultImg.url}`;
          }

          others.push({
            id: otherData[i]._id,
            title: otherData[i].title,
            price: otherData[i].price,
            priceNegotiable: otherData[i].priceNegotiable,
            image,
          });
        }
      }
    }

    res.json({
      id: ad._id,
      title: ad.title,
      price: ad.price,
      priceNegotiable: ad.priceNegotiable,
      description: ad.description,
      dateCreated: ad.dateCreated,
      views: ad.views,
      images,
      category,
      userInfo: userInfo
        ? {
            name: userInfo.name,
            email: userInfo.email,
          }
        : { name: "Usuário não encontrado", email: "" },
      stateName: stateInfo ? stateInfo.name : "Estado não encontrado",
      stateName: stateInfo.name,
      others,
    });
  },
  editAction: async (req, res) => {
    let { id } = req.params;
    let { title, status, price, priceneg, desc, cat, images, token } = req.body;
    //console.log(req.body);

    if (id.length < 12) {
      res.json({ error: "ID inválido" });
      return;
    }

    const ad = await Ad.findById(id).exec();
    if (!ad) {
      res.json({ error: "Anúncio inexistente" });
      return;
    }

    const user = await User.findOne({ token }).exec();
    if (user._id.toString() !== ad.idUser) {
      res.json({ error: "Este anúncio não é seu" });
      return;
    }

    let updates = {};

    if (title) {
      updates.title = title;
    }
    if (price) {
      price = price.replace(".", "").replace(",", ".").replace("R$ ", "");
      price = parseFloat(price);
      updates.price = price;
    }
    if (priceneg) {
      updates.priceNegotiable = priceneg;
    }
    if (status) {
      updates.status = status;
    }
    if (desc) {
      updates.description = desc;
    }
    if (cat) {
      //console.log("Categoria recebida:", cat);
      const category = await Category.findById(cat).exec();

      if (!category) {
        res.json({ error: "Categoria inexistente" });
        return;
      }
      updates.category = category._id.toString();
    }

    if (req.files && req.files.img) {
      const imageFiles = Array.isArray(req.files.img)
        ? req.files.img
        : [req.files.img];

      let imageUrls = [];

      for (const img of imageFiles) {
        if (["image/jpeg", "image/jpg", "image/png"].includes(img.mimetype)) {
          try {
            const result = await new Promise((resolve, reject) => {
              cloudinary.uploader
                .upload_stream(
                  {
                    folder: "ads",
                    public_id: uuid(),
                    transformation: [
                      { width: 500, height: 500, crop: "limit" },
                    ],
                  },
                  (error, uploadResult) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve(uploadResult);
                    }
                  }
                )
                .end(img.data);
            });

            imageUrls.push(result.secure_url);
          } catch (error) {
            console.error("Erro ao enviar imagem para o Cloudinary:", error);
          }
        }
      }
      if (imageUrls.length > 0) {
        updates.images = imageUrls.map((url, index) => ({
          url,
          default: index === 0,
        }));
      }
    }

    await Ad.findByIdAndUpdate(id, { $set: updates });

    res.json({ error: "" });
  },
};

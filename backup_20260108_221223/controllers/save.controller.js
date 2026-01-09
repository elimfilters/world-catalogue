const Filtro = require("../models/Filtro");

module.exports = async (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.donaldsonCode && !data.framCode)) {
      return res.status(400).json({ success: false, error: "Falta donaldsonCode o framCode" });
    }

    data.updatedAt = new Date();

    const query = {
      $or: [
        data.donaldsonCode ? { donaldsonCode: data.donaldsonCode } : null,
        data.framCode ? { framCode: data.framCode } : null,
      ].filter(Boolean),
    };

    const updated = await Filtro.findOneAndUpdate(query, data, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error al guardar en /api/save:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

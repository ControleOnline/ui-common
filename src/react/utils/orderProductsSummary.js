// Summary shown in proposal/contract headers: only top-level lines count;
// component/addition rows are already priced inside their parent line.

const isTopLevelOrderProduct = item => !item?.orderProduct && !item?.parentProduct;

const summarizeOrderProducts = items => {
  const lines = (Array.isArray(items) ? items : []).filter(isTopLevelOrderProduct);
  const total = lines.reduce((sum, item) => {
    const lineTotal = Number(item?.total);
    if (Number.isFinite(lineTotal)) {
      return sum + lineTotal;
    }
    return sum + Number(item?.price || 0) * Number(item?.quantity || 0);
  }, 0);

  return { count: lines.length, total: Math.round(total * 100) / 100 };
};

const formatBRL = value =>
  `R$ ${Number(value || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

module.exports = {
  formatBRL,
  summarizeOrderProducts,
};

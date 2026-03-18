const { Router } = require('express');
const ctrl       = require('../controllers/transaccionController');

const router = Router();

// IMPORTANTE: /resumen debe definirse antes de /:id
// para que Express no lo interprete como un ID con valor "resumen"
router.get('/resumen', ctrl.getResumen);

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getOne);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

const test = require('node:test');
const assert = require('node:assert');
const { crearLimite } = require('../middleware/limite.Middleware');

const respuesta = () => {
  const r = { cabeceras: {}, codigo: 200, cuerpo: null };
  r.setHeader = (k, v) => { r.cabeceras[k] = v; };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
};

test('deja pasar hasta el máximo y corta con 429 después', () => {
  let t = 1000;
  const limitar = crearLimite({ max: 3, ventanaMs: 60000, ahora: () => t });
  let pasaron = 0;
  for (let i = 0; i < 3; i++) limitar({ ip: '1.1.1.1' }, respuesta(), () => { pasaron += 1; });
  assert.strictEqual(pasaron, 3);

  const r = respuesta();
  limitar({ ip: '1.1.1.1' }, r, () => assert.fail('no debía pasar'));
  assert.strictEqual(r.codigo, 429);
  assert.ok(Number(r.cabeceras['Retry-After']) >= 1);
});

test('cuenta cada IP por separado y se reinicia al terminar la ventana', () => {
  let t = 0;
  const limitar = crearLimite({ max: 1, ventanaMs: 1000, ahora: () => t });
  let pasaron = 0;
  limitar({ ip: 'a' }, respuesta(), () => { pasaron += 1; });
  limitar({ ip: 'b' }, respuesta(), () => { pasaron += 1; });
  assert.strictEqual(pasaron, 2);

  const r = respuesta();
  limitar({ ip: 'a' }, r, () => {});
  assert.strictEqual(r.codigo, 429);

  t = 1500;
  limitar({ ip: 'a' }, respuesta(), () => { pasaron += 1; });
  assert.strictEqual(pasaron, 3);
});

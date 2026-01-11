const construction = require('./construction.patterns');
const mining = require('./mining.patterns');
const agriculture = require('./agriculture.patterns');
const transportation = require('./transportation.patterns');
const marine = require('./marine.patterns');
const powerGeneration = require('./power-generation.patterns');
const oilGas = require('./oil-gas.patterns');
const forestry = require('./forestry.patterns');
const materialHandling = require('./material-handling.patterns');
const aftermarket = require('./aftermarket.patterns');
const lightDuty = require('./light-duty.patterns');

const allManufacturers = [
  ...construction.manufacturers,
  ...mining.manufacturers,
  ...agriculture.manufacturers,
  ...transportation.manufacturers,
  ...marine.manufacturers,
  ...powerGeneration.manufacturers,
  ...oilGas.manufacturers,
  ...forestry.manufacturers,
  ...materialHandling.manufacturers,
  ...aftermarket.manufacturers,
  ...lightDuty.manufacturers
];

const byIndustry = {
  construction,
  mining,
  agriculture,
  transportation,
  marine,
  powerGeneration,
  oilGas,
  forestry,
  materialHandling,
  aftermarket,
  lightDuty
};

module.exports = {
  allManufacturers,
  byIndustry,
  construction,
  mining,
  agriculture,
  transportation,
  marine,
  powerGeneration,
  oilGas,
  forestry,
  materialHandling,
  aftermarket,
  lightDuty
};

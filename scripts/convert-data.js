#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'data', '5b8996b557ee9d04cfc42427afb3228b_export.json');
const OUTPUT_PATH = path.join(ROOT, 'public', 'data', 'smoking-areas.json');

// Taipei's 12 districts are a fixed, known set, so a hardcoded romanization
// table avoids pulling in a general-purpose pinyin dependency.
const DISTRICT_SLUGS = {
  '松山區': 'songshan',
  '信義區': 'xinyi',
  '大安區': 'daan',
  '中山區': 'zhongshan',
  '中正區': 'zhongzheng',
  '大同區': 'datong',
  '萬華區': 'wanhua',
  '文山區': 'wenshan',
  '南港區': 'nangang',
  '內湖區': 'neihu',
  '士林區': 'shilin',
  '北投區': 'beitou',
};

function slugForDistrict(district) {
  return DISTRICT_SLUGS[district] || district;
}

function toNumber(value, field, record) {
  const num = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(num)) {
    throw new Error(`Invalid ${field} value "${value}" for record ${JSON.stringify(record)}`);
  }
  return num;
}

function convert(records) {
  const districtCounters = new Map();

  return records.map((record) => {
    const district = record['行政區'];
    const count = (districtCounters.get(district) || 0) + 1;
    districtCounters.set(district, count);
    const id = `${slugForDistrict(district)}-${String(count).padStart(2, '0')}`;

    const photoUrl = record['照片連結'];

    return {
      id,
      district,
      name: record['地點'],
      address: record['地址'],
      type: record['樣態'],
      hours: record['開放時間'],
      lat: toNumber(record['緯度'], 'lat', record),
      lng: toNumber(record['經度'], 'lng', record),
      relativePosition: record['相對位置'],
      photoUrl: photoUrl ? photoUrl : null,
      managedBy: record['管理單位'],
      managedByPhone: record['管理單位電話'],
      note: record['備註'],
    };
  });
}

function main() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    throw new Error('Expected source JSON to be a top-level array.');
  }

  const areas = convert(records);

  const output = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'Taipei City Government Open Data',
    areas,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`Converted ${areas.length} records -> ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();

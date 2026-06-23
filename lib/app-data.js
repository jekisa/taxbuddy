import { ensureIndexes, getDb } from "./mongodb";

const SETTINGS_KEY = "global";
const EMPTY_APP_DATA = {
  db_penjual: {},
  db_pembeli: {},
  db_pemasok: {},
  templates: {},
  dlm_templates: {},
};

export async function getAppData() {
  const db = await getDb();
  await ensureIndexes(db);
  const doc = await db.collection("app_settings").findOne({ key: SETTINGS_KEY });
  return { ...EMPTY_APP_DATA, ...(doc?.data || {}) };
}

export async function saveAppData(data) {
  const db = await getDb();
  await ensureIndexes(db);
  const nextData = { ...EMPTY_APP_DATA, ...(data || {}) };
  await db.collection("app_settings").updateOne(
    { key: SETTINGS_KEY },
    {
      $set: {
        data: nextData,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  return nextData;
}

export async function upsertDbEntry(kind, name, payload) {
  const appData = await getAppData();
  const key = `db_${kind}`;
  if (!appData[key]) throw new Error("Jenis database tidak valid.");
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Nama wajib diisi.");
  appData[key] = {
    ...appData[key],
    [cleanName]: payload,
  };
  return saveAppData(appData);
}

export async function deleteDbEntry(kind, name) {
  const appData = await getAppData();
  const key = `db_${kind}`;
  if (!appData[key]) throw new Error("Jenis database tidak valid.");
  const next = { ...appData[key] };
  delete next[String(name || "")];
  appData[key] = next;
  return saveAppData(appData);
}

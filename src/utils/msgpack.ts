import { Packr } from "msgpackr";

// Standard msgpack encoder/decoder configured for broad compatibility.
export const msgpack = new Packr({ useRecords: false, moreTypes: false });

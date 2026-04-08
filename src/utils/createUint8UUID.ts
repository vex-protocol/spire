import { parse as uuidParse } from "uuid";

export function createUint8UUID(): Uint8Array {
    return uuidToUint8(crypto.randomUUID());
}

export function uuidToUint8(uuid: string): Uint8Array {
    return new Uint8Array(uuidParse(uuid));
}

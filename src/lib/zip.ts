const encoder = new TextEncoder();

export interface ZipEntry {
	name: string;
	data: Uint8Array;
}

// ponytail: store method only (no deflate), images are already compressed,
// add CompressionStream deflate-raw if text-like files are ever zipped
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
	const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	return { time, date: day };
}

/**
 * Build a zip archive using the store (no compression) method.
 * Dependency-free replacement for a zip library.
 */
export function createZip(entries: ZipEntry[], now = new Date()): Blob {
	const { time, date } = dosDateTime(now);
	const parts: BlobPart[] = [];
	const central: Uint8Array<ArrayBuffer>[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.name);
		// copy into an ArrayBuffer backed view, Blob accepts that shape
		const data = new Uint8Array(entry.data.length);
		data.set(entry.data);
		const crc = crc32(data);

		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, 20, true);
		lv.setUint16(6, 0x0800, true);
		lv.setUint16(8, 0, true);
		lv.setUint16(10, time, true);
		lv.setUint16(12, date, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, data.length, true);
		lv.setUint32(22, data.length, true);
		lv.setUint16(26, name.length, true);
		lv.setUint16(28, 0, true);
		local.set(name, 30);
		parts.push(local, data);

		const dir = new Uint8Array(46 + name.length);
		const dv = new DataView(dir.buffer);
		dv.setUint32(0, 0x02014b50, true);
		dv.setUint16(4, 20, true);
		dv.setUint16(6, 20, true);
		dv.setUint16(8, 0x0800, true);
		dv.setUint16(10, 0, true);
		dv.setUint16(12, time, true);
		dv.setUint16(14, date, true);
		dv.setUint32(16, crc, true);
		dv.setUint32(20, data.length, true);
		dv.setUint32(24, data.length, true);
		dv.setUint16(28, name.length, true);
		dv.setUint32(42, offset, true);
		dir.set(name, 46);
		central.push(dir);

		offset += local.length + data.length;
	}

	const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, offset, true);

	return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

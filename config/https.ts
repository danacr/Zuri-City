import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

/** A project-local CA, never installed into a device's trust store automatically. */
export function localHttps() {
	const directory = resolve('.certs');
	mkdirSync(directory, { recursive: true, mode: 0o700 });
	const file = (name: string) => resolve(directory, name);
	const openssl = (...args: string[]) => execFileSync('openssl', args, { stdio: 'pipe' });
	const valid = (name: string) => {
		if (!existsSync(file(name))) return false;
		try {
			openssl('x509', '-checkend', '86400', '-noout', '-in', file(name));
			return true;
		} catch {
			return false;
		}
	};
	const ips = [
		...new Set([
			'127.0.0.1',
			'::1',
			...Object.values(networkInterfaces()).flatMap((entries) =>
				(entries || []).filter((entry) => entry.family === 'IPv4').map((entry) => entry.address)
			)
		])
	].sort();
	const hosts = JSON.stringify(ips);
	let newRoot = false;
	try {
		if (!valid('rootCA.crt') || !existsSync(file('rootCA-key.pem'))) {
			openssl(
				'req',
				'-x509',
				'-newkey',
				'rsa:2048',
				'-nodes',
				'-sha256',
				'-days',
				'3650',
				'-keyout',
				file('rootCA-key.pem'),
				'-out',
				file('rootCA.crt'),
				'-subj',
				'/CN=Zuri City Local Development CA',
				'-addext',
				'basicConstraints=critical,CA:TRUE',
				'-addext',
				'keyUsage=critical,keyCertSign,cRLSign'
			);
			newRoot = true;
		}
		if (
			newRoot ||
			!valid('localhost.crt') ||
			!existsSync(file('localhost-key.pem')) ||
			!existsSync(file('hosts.json')) ||
			readFileSync(file('hosts.json'), 'utf8') !== hosts
		) {
			writeFileSync(
				file('server.ext'),
				[
					'basicConstraints=critical,CA:FALSE',
					'keyUsage=critical,digitalSignature,keyEncipherment',
					'extendedKeyUsage=serverAuth',
					`subjectAltName=DNS:localhost,${ips.map((ip) => `IP:${ip}`).join(',')}`
				].join('\n')
			);
			openssl(
				'req',
				'-new',
				'-newkey',
				'rsa:2048',
				'-nodes',
				'-sha256',
				'-keyout',
				file('localhost-key.pem'),
				'-out',
				file('localhost.csr'),
				'-subj',
				'/CN=localhost'
			);
			openssl(
				'x509',
				'-req',
				'-in',
				file('localhost.csr'),
				'-CA',
				file('rootCA.crt'),
				'-CAkey',
				file('rootCA-key.pem'),
				'-CAcreateserial',
				'-out',
				file('localhost.crt'),
				'-days',
				'30',
				'-sha256',
				'-extfile',
				file('server.ext')
			);
			writeFileSync(file('hosts.json'), hosts);
		}
	} catch {
		throw new Error(
			'Could not create local HTTPS certificates. Install OpenSSL with support for req -addext, then restart. See README.md.'
		);
	}
	return {
		key: readFileSync(file('localhost-key.pem')),
		cert: readFileSync(file('localhost.crt'))
	};
}

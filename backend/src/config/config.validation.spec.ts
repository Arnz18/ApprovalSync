import { validateConfig } from './config.validation';

describe('validateConfig', () => {
  it('should accept valid development configuration with defaults', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: '3000',
      DB_PORT: '5432',
    };
    expect(validateConfig(config)).toEqual(config);
  });

  it('should reject invalid PORT values', () => {
    expect(() => validateConfig({ PORT: 'invalid' })).toThrow(
      /PORT must be a valid port number/,
    );
    expect(() => validateConfig({ PORT: '70000' })).toThrow(
      /PORT must be a valid port number/,
    );
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => validateConfig({ NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV must be one of/,
    );
  });

  it('should reject invalid DB_PORT values', () => {
    expect(() => validateConfig({ DB_PORT: 'not-a-port' })).toThrow(
      /DB_PORT must be a valid port number/,
    );
    expect(() => validateConfig({ DB_PORT: '99999' })).toThrow(
      /DB_PORT must be a valid port number/,
    );
  });

  it('should reject default dev password in production environment', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        PORT: '3000',
        DB_PASSWORD: 'postgres_dev_password',
      }),
    ).toThrow(
      /Production environment cannot rely on default or empty DB_PASSWORD/,
    );

    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        PORT: '3000',
        DB_PASSWORD: '',
      }),
    ).toThrow(
      /Production environment cannot rely on default or empty DB_PASSWORD/,
    );
  });

  it('should accept production environment with strong custom DB_PASSWORD', () => {
    const prodConfig = {
      NODE_ENV: 'production',
      PORT: '3000',
      DB_PASSWORD: 'secure_custom_prod_secret_123!',
    };
    expect(validateConfig(prodConfig)).toEqual(prodConfig);
  });
});

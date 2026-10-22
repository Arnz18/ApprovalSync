import { validateConfig } from './config.validation';

describe('validateConfig', () => {
  const validProdBase = {
    NODE_ENV: 'production',
    PORT: '3000',
    DB_HOST: 'prod-db.internal',
    DB_PORT: '5432',
    DB_NAME: 'approvalsync_prod',
    DB_USER: 'approvalsync_app',
    DB_PASSWORD: 'super_secret_production_password_#2026',
  };

  describe('development configuration', () => {
    it('should accept valid development configuration with defaults', () => {
      const config = {
        NODE_ENV: 'development',
        PORT: '3000',
        DB_PORT: '5432',
      };
      expect(validateConfig(config)).toEqual(config);
    });

    it('should accept valid configuration with explicit log levels', () => {
      for (const level of ['debug', 'info', 'warn', 'error', 'fatal']) {
        const config = {
          NODE_ENV: 'development',
          PORT: '3000',
          LOG_LEVEL: level,
        };
        expect(validateConfig(config)).toEqual(config);
      }
    });

    it('should reject unsupported LOG_LEVEL values', () => {
      expect(() =>
        validateConfig({
          NODE_ENV: 'development',
          LOG_LEVEL: 'verbose',
        }),
      ).toThrow(/LOG_LEVEL must be one of/);
    });
  });

  describe('PORT validation', () => {
    it('should accept boundary values 1 and 65535', () => {
      expect(validateConfig({ PORT: '1' })).toEqual({ PORT: '1' });
      expect(validateConfig({ PORT: '65535' })).toEqual({ PORT: '65535' });
    });

    it('should reject invalid PORT values', () => {
      expect(() => validateConfig({ PORT: 'invalid' })).toThrow(
        /PORT must be a valid port number/,
      );
      expect(() => validateConfig({ PORT: '0' })).toThrow(
        /PORT must be a valid port number/,
      );
      expect(() => validateConfig({ PORT: '-1' })).toThrow(
        /PORT must be a valid port number/,
      );
      expect(() => validateConfig({ PORT: '65536' })).toThrow(
        /PORT must be a valid port number/,
      );
      expect(() => validateConfig({ PORT: '3000.5' })).toThrow(
        /PORT must be a valid port number/,
      );
    });
  });

  describe('NODE_ENV validation', () => {
    it('should accept valid NODE_ENV values', () => {
      for (const env of ['development', 'test', 'production']) {
        const config =
          env === 'production'
            ? { ...validProdBase }
            : { NODE_ENV: env, PORT: '3000' };
        expect(validateConfig(config)).toEqual(config);
      }
    });

    it('should reject invalid NODE_ENV values', () => {
      expect(() => validateConfig({ NODE_ENV: 'staging' })).toThrow(
        /NODE_ENV must be one of/,
      );
      expect(() => validateConfig({ NODE_ENV: 'local' })).toThrow(
        /NODE_ENV must be one of/,
      );
    });
  });

  describe('DB_PORT validation', () => {
    it('should accept valid DB_PORT boundary values', () => {
      expect(validateConfig({ DB_PORT: '1' })).toEqual({ DB_PORT: '1' });
      expect(validateConfig({ DB_PORT: '65535' })).toEqual({
        DB_PORT: '65535',
      });
    });

    it('should reject invalid DB_PORT values', () => {
      expect(() => validateConfig({ DB_PORT: 'not-a-port' })).toThrow(
        /DB_PORT must be a valid port number/,
      );
      expect(() => validateConfig({ DB_PORT: '0' })).toThrow(
        /DB_PORT must be a valid port number/,
      );
      expect(() => validateConfig({ DB_PORT: '-5432' })).toThrow(
        /DB_PORT must be a valid port number/,
      );
      expect(() => validateConfig({ DB_PORT: '65536' })).toThrow(
        /DB_PORT must be a valid port number/,
      );
      expect(() => validateConfig({ DB_PORT: '5432.1' })).toThrow(
        /DB_PORT must be a valid port number/,
      );
    });
  });

  describe('production safeguards', () => {
    it('should accept valid production configuration with secure credentials', () => {
      expect(validateConfig(validProdBase)).toEqual(validProdBase);
    });

    it('should reject missing, empty, or whitespace DB_PASSWORD in production', () => {
      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_PASSWORD: '',
        }),
      ).toThrow(
        /Production environment cannot rely on default or empty DB_PASSWORD/,
      );

      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_PASSWORD: '   ',
        }),
      ).toThrow(
        /Production environment cannot rely on default or empty DB_PASSWORD/,
      );

      const withoutPassword = { ...validProdBase };
      delete (withoutPassword as Record<string, unknown>).DB_PASSWORD;
      expect(() => validateConfig(withoutPassword)).toThrow(
        /Production environment cannot rely on default or empty DB_PASSWORD/,
      );
    });

    it('should reject development placeholder password in production', () => {
      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_PASSWORD: 'postgres_dev_password',
        }),
      ).toThrow(
        /Production environment cannot rely on default or empty DB_PASSWORD/,
      );
    });

    it('should reject postgres trivial default password in production', () => {
      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_PASSWORD: 'postgres',
        }),
      ).toThrow(
        /Production environment cannot rely on default or empty DB_PASSWORD/,
      );
    });

    it('should reject missing DB_HOST, DB_NAME, or DB_USER in production', () => {
      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_HOST: '',
        }),
      ).toThrow(/requires DB_HOST to be specified/);

      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_NAME: '',
        }),
      ).toThrow(/requires DB_NAME to be specified/);

      expect(() =>
        validateConfig({
          ...validProdBase,
          DB_USER: '',
        }),
      ).toThrow(/requires DB_USER to be specified/);
    });

    it('should never leak password or sensitive values in validation errors', () => {
      const secret = 'super_secret_sensitive_value_never_print_this!';
      try {
        validateConfig({
          NODE_ENV: 'production',
          DB_PASSWORD: 'postgres_dev_password',
          PORT: 'invalid_port',
          UNSAFE_SECRET: secret,
        });
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).not.toContain(secret);
        expect(message).not.toContain('postgres_dev_password');
      }
    });
  });
});

/**
 * ApprovalSync — Providers Module
 * Milestone: DOC-05
 *
 * Configures the issuer verification provider layer, registry, simulated adapter,
 * authorized adapter seams, and REST controller endpoints.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../database/entities/document.entity';
import { Application } from '../database/entities/application.entity';
import { DocumentsModule } from '../documents/documents.module';
import { ProvidersController } from './providers.controller';
import { SimulatedIssuerAdapter } from './adapters/simulated-issuer.adapter';
import { AuthorizedDigiLockerAdapter } from './adapters/authorized-digilocker.adapter';
import { AuthorizedLandRegistryAdapter } from './adapters/authorized-land-registry.adapter';
import { ProviderRegistryService } from './services/provider-registry.service';
import { IssuerVerificationService } from './services/issuer-verification.service';
import {
  VERIFICATION_PROVIDER_TOKEN,
  PROVIDER_REGISTRY_TOKEN,
} from './interfaces';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Application]),
    ConfigModule,
    DocumentsModule,
  ],
  controllers: [ProvidersController],
  providers: [
    SimulatedIssuerAdapter,
    AuthorizedDigiLockerAdapter,
    AuthorizedLandRegistryAdapter,
    ProviderRegistryService,
    IssuerVerificationService,
    {
      provide: VERIFICATION_PROVIDER_TOKEN,
      useExisting: SimulatedIssuerAdapter,
    },
    {
      provide: PROVIDER_REGISTRY_TOKEN,
      useExisting: ProviderRegistryService,
    },
  ],
  exports: [
    IssuerVerificationService,
    ProviderRegistryService,
    SimulatedIssuerAdapter,
    AuthorizedDigiLockerAdapter,
    AuthorizedLandRegistryAdapter,
    VERIFICATION_PROVIDER_TOKEN,
    PROVIDER_REGISTRY_TOKEN,
  ],
})
export class ProvidersModule {}

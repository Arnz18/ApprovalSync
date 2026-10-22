/**
 * ApprovalSync — Institution Entity
 * Milestone: BE-02
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_institutions_reg_no', { unique: true })
  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  registrationNumber: string;

  @Column({ name: 'institution_type', type: 'varchar', length: 100 })
  institutionType: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 10 })
  pincode: string;

  @Column({ type: 'text' })
  address: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.institution)
  users: User[];

  @OneToMany(() => Application, (application) => application.institution)
  applications: Application[];
}

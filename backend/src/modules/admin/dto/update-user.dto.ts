import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { UserRole } from '../../../common/enums/user-role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  username?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

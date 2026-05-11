import { IsString, IsOptional } from 'class-validator';

export class AddStockDto {
  @IsString()
  token!: string;

  @IsString()
  @IsOptional()
  exchange?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

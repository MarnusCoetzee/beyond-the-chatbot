import {
  IsString,
  IsUrl,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LlmConfigDto {
  @IsUrl({}, { message: 'baseUrl must be a valid URL' })
  baseUrl!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;
}

class SearchConfigDto {
  @IsIn(['firecrawl', 'brave'])
  provider!: 'firecrawl' | 'brave';

  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ValidateNested()
  @Type(() => LlmConfigDto)
  llmConfig!: LlmConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchConfigDto)
  searchConfig?: SearchConfigDto;
}

import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class AnswerQuestionDto {
  @IsInt()
  @Min(0)
  @Max(3)
  selectedOptionIndex!: number;

  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{8,100}$/)
  @MaxLength(100)
  submissionKey!: string;
}

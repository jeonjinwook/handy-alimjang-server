import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { TeacherService } from 'src/teacher/teacher.service';
import { StudentService } from 'src/student/student.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    private teacherService: TeacherService,
    private studentService: StudentService,
  ) {}

  async register(user: any) {
    const find_email = await this.userService.findOne(user.email);

    if (find_email) {
      throw new HttpException(
        '이미 사용하고 있는 아이디입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const return_user = await this.userService.create(user);

      const user_type = return_user.user_type;

      if (user_type == 'teacher') {
        await this.teacherService.create({
          ...user,
          user_id: return_user.id,
        });
      } else if (user_type == 'student') {
        await this.studentService.create({
          ...user,
          user_id: return_user.id,
        });
      }
    } catch (e) {
      throw new HttpException(
        '회원가입에 실패했습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateUser(email: string, plainTextPassword: string): Promise<any> {
    try {
      const user = await this.userService.findOne(email);
      await this.verifyPassword(plainTextPassword, user.password);
      const { password, ...result } = user;

      return result;
    } catch (error) {
      throw new HttpException(
        '비밀번호가 일치하지 않습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);

    if (!isMatch) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  getAccessToken(user: any) {
    const payload = { email: user.email, id: user.id };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET_KEY,
      expiresIn: `${process.env.JWT_ACCESS_EXPIRATION_TIME}s`,
    });

    return {
      accessToken,
      httpOnly: true,
      maxAge: Number(process.env.JWT_ACCESS_EXPIRATION_TIME) * 1000,
    };
  }

  getRefreshToken(user: any) {
    const payload = { email: user.email, id: user.id };
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET_KEY,
      expiresIn: `${process.env.JWT_REFRESH_EXPIRATION_TIME}s`,
    });
    return {
      refreshToken,
      httpOnly: true,
      maxAge: Number(process.env.JWT_REFRESH_EXPIRATION_TIME) * 1000,
    };
  }
}

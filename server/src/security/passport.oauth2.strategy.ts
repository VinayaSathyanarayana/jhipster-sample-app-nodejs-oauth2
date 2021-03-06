import Strategy = require('passport-oauth2');
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger, HttpService } from '@nestjs/common';
import { config } from '../config';
import { AuthService } from '../service/auth.service';
import { oauth2Config } from './oauth2.config';

const clientID = config.get('jhipster.security.oauth2.client.registration.oidc.client-id');
const clientSecret = config.get('jhipster.security.oauth2.client.registration.oidc.client-secret');

@Injectable()
export class Oauth2Strategy extends PassportStrategy(Strategy) {
  logger = new Logger('oauth2');

  constructor(private readonly authService: AuthService, private readonly httpService: HttpService) {
    super(
      {
        authorizationURL: oauth2Config.authorizationURL,
        tokenURL: oauth2Config.tokenURL,
        clientID: `${clientID}`,
        clientSecret: `${clientSecret}`,
        callbackURL: oauth2Config.callbackURL,
        scope: 'openid profile',
        state: true,
        pkce: true
      },
      async (accessToken: any, refreshToken: any, params: any, user: any, done: any) => {
        const idToken = params.id_token;
        await this.authService.findUserOrSave(user);
        user.idToken = idToken;
        return done(null, user);
      }
    );
  }

  async userProfile(accessToken: any, done: any): Promise<any> {
    // roles with id http://dev-281272.okta.com/api/v1/users/<id>/roles
    // id in http://dev-281272.okta.com/api/v1/users/me
    return await this.httpService
      .get(oauth2Config.userInfoUrl, {
        headers: {
          // Include the token in the Authorization header
          Authorization: 'Bearer ' + accessToken
        }
      })
      .toPromise()
      .then(res => {
        const profile = res.data;

        const userProfile = {
          login: profile.preferred_username,
          password: '***',
          firstName: profile.given_name,
          lastName: profile.family_name,
          email: profile.email,
          imageUrl: '',
          activated: true,
          langKey: 'en',
          createdBy: 'system',
          lastModifiedBy: 'system',
          authorities: ['ROLE_ADMIN', 'ROLE_USER']
        };

        return done(null, userProfile);
      })
      .catch(e => {
        this.logger.error(e);
        return done(new UnauthorizedException({ message: 'error to retrieve user info from accessToken' }), false);
      });
  }
}

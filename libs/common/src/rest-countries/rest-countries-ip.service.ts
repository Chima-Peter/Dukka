import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';

type RestCountriesIpResponse = {
    data?: {
        objects?: Array<{
            location?: {
                country?: {
                    codes?: {
                        alpha_2?: string | null;
                    };
                };
            };
        }>;
    };
};

@Injectable()
export class RestCountriesIpService {
    private readonly logger = new Logger(RestCountriesIpService.name);

    constructor(
        private readonly http: HttpClient,
        private readonly configService: ConfigService,
    ) {}

    async resolveIso2(ip: string): Promise<string | null> {
        try {
            const apiKey = this.configService.getOrThrow<string>(
                'REST_COUNTRIES_API_KEY',
            );
            const response = await this.http.get<RestCountriesIpResponse>(
                `https://api.restcountries.com/ip/v1/${encodeURIComponent(ip)}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                },
            );

            const iso2 =
                response.data?.data?.objects?.[0]?.location?.country?.codes
                    ?.alpha_2;
            if (!iso2) {
                this.logger.warn(
                    `REST Countries IP lookup returned no iso2 for ${ip}`,
                );
                return null;
            }

            return iso2.toUpperCase();
        } catch (error) {
            this.logger.warn(
                `REST Countries IP lookup failed for ${ip}: ${error}`,
            );
            return null;
        }
    }
}

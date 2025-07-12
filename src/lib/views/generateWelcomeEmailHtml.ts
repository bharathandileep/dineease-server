export const generateWelcomeEmailHtml = (username: string, password: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                  <td style="padding: 40px 30px; text-align: center; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                      <img src="https://res.cloudinary.com/dykrwhqxp/image/upload/v1737458109/wd3uot8u28dnocmtau9s.png" alt="Dineeas" style="max-width: 200px; height: auto;">
                  </td>
              </tr>
              <tr>
                  <td style="padding: 20px 30px;">
                      <h1 style="color: #333333; font-size: 24px; margin: 0; text-align: center;">Welcome to Dineeas!</h1>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 20px 30px;">
                      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0;">Hello <strong>${username}</strong>,</p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-top: 15px;">
                          Welcome to <strong>Dineeas</strong>! Your account has been successfully created. Here are your login credentials:
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 20px 30px;">
                      <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px;">
                          <p style="font-size: 18px; font-weight: bold; color: #333333; text-align: center; margin: 0;">
                              Username: <strong>${username}</strong>
                          </p>
                          <p style="font-size: 18px; font-weight: bold; color: #333333; text-align: center; margin-top: 10px;">
                              Password: <strong>${password}</strong>
                          </p>
                      </div>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 20px 30px;">
                      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0;">
                          For security reasons, we recommend changing your password after logging in for the first time.
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-top: 15px;">
                          If you have any questions, feel free to contact our support team.
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 20px 30px; text-align: center;">
                      <a href="https://dineeas.com/login" style="background-color: #ff6600; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 16px; display: inline-block;">
                          Login Now
                      </a>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `;
  };
  
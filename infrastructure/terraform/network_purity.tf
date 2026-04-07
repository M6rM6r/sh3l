# Terraform infrastructure to enforce optimal edge caching and static delivery purity.
# Executing mathematically calculated origin shielding.

provider "aws" {
  region = "us-east-1"
}

# Strict S3 Bucket initialization prohibiting public access entirely at the core layer.
resource "aws_s3_bucket" "frontend_static" {
  bucket = "Ygy-clone-frontend-production-state"
}

resource "aws_s3_bucket_public_access_block" "block_purity" {
  bucket = aws_s3_bucket.frontend_static.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Identity initialization for OAI secure bridging
resource "aws_cloudfront_origin_access_identity" "oai_strict" {
  comment = "Strict automated OAI for S3 Frontend Purity"
}

# Absolute CloudFront layer optimizing path-based behaviors and eliminating unencrypted handshakes.
resource "aws_cloudfront_distribution" "global_edge" {
  origin {
    domain_name = aws_s3_bucket.frontend_static.bucket_regional_domain_name
    origin_id   = "s3-exact-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai_strict.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-exact-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Redirecting protocol downgrades aggressively
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}



